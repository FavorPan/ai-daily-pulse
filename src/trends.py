"""
趋势检测模块：找出当天在多个信源同时出现的主题。

策略：
1. 对每篇文章提取关键词（标题分词 + LLM 标签）
2. 按关键词聚类，同一关键词在 3+ 个不同源出现 → 标记为强信号
3. 给相关文章添加 trend_signal=True 和 trend_topic 字段
"""

import logging
import re
from collections import defaultdict

logger = logging.getLogger(__name__)

# 停用词：太通用的词不参与聚类
_STOPWORDS = {
    "ai", "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "shall", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "above", "below", "between", "out",
    "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
    "neither", "each", "every", "all", "any", "few", "more", "most",
    "other", "some", "such", "no", "only", "own", "same", "than",
    "too", "very", "just", "because", "if", "when", "where", "how",
    "what", "which", "who", "whom", "this", "that", "these", "those",
    "it", "its", "i", "me", "my", "we", "our", "you", "your", "he",
    "him", "his", "she", "her", "they", "them", "their",
    # 中文停用词
    "的", "了", "在", "是", "和", "与", "对", "为", "将", "已", "被",
    "从", "到", "也", "有", "这", "那", "中", "人", "个", "大", "小",
    "上", "下", "不", "会", "能", "可", "以", "就", "都", "而", "及",
    "等", "或", "但", "如", "所", "之", "其", "新", "更", "还",
    # 中文通用 2-gram（太常见，不具趋势区分度）
    "通过", "实现", "公司", "技术", "开发", "平台", "产品", "功能",
    "使用", "进行", "提供", "支持", "包括", "目前", "以及", "已经",
    "其中", "可以", "基于", "这些", "那些", "主要", "同时", "需要",
    "表示", "认为", "介绍", "发布", "系统", "数据", "方案", "用户",
    "应用", "服务", "行业", "市场", "增长", "全球", "投资", "中国",
    "智能", "模型", "能力", "工具", "解决", "旨在", "规模", "利用",
    "方面", "相关", "此外", "不仅", "成为", "未来", "推动", "加速",
    "提升", "降低", "带来", "面临", "选择", "方式", "为什么", "什么",
    "核心", "自动", "成本", "项目", "问题", "工作", "运行", "采用",
    "处理", "计划", "优化", "开源", "直接", "无需", "模式", "效率",
    "构建", "文章", "生成", "一个", "多个", "用户", "开发者", "美元",
    "现了", "发者", "任务", "内容", "环境", "能力", "比如", "可能",
    "代码", "基础", "真正", "需要", "最新", "关键", "快速", "简单",
    "标准", "实际", "重要", "有效", "传统", "免费", "完整", "安全",
}


def _extract_keywords(text: str) -> set[str]:
    """从文本中提取关键词（英文按词、中文按 2-4 gram）。"""
    keywords = set()

    # 英文词
    for word in re.findall(r"[a-zA-Z][a-zA-Z0-9+.#-]{1,}", text):
        w = word.lower()
        if w not in _STOPWORDS and len(w) >= 3:
            keywords.add(w)

    # 中文 3-gram（2-gram 太通用，区分度低）
    cn_chars = re.findall(r"[\u4e00-\u9fff]+", text)
    for seg in cn_chars:
        if len(seg) >= 3:
            for i in range(len(seg) - 2):
                gram = seg[i:i+3]
                if gram not in _STOPWORDS:
                    keywords.add(gram)

    return keywords


def detect_trends(articles: list[dict], min_sources: int = 3) -> list[dict]:
    """
    检测趋势：同一关键词在 min_sources 个不同源出现 → 强信号。

    给相关文章添加：
    - trend_signal: bool
    - trend_topic: str (命中的关键词)
    - trend_source_count: int (命中几个源)

    返回添加了 trend 字段的文章列表。
    """
    if not articles:
        return articles

    # 构建 keyword -> set(sources) 映射
    keyword_sources: dict[str, set[str]] = defaultdict(set)
    keyword_articles: dict[str, list[dict]] = defaultdict(list)

    for a in articles:
        # 优先用 LLM 标签（更精准），再补充文本关键词
        tags = a.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        elif not isinstance(tags, list):
            tags = []
        keywords = set()
        # LLM 标签直接作为关键词（不拆分，保留完整短语）
        for tag in tags:
            tag_clean = tag.strip().lower()
            if len(tag_clean) >= 2 and tag_clean not in _STOPWORDS:
                keywords.add(tag_clean)

        source = a.get("source", "unknown")
        for kw in keywords:
            keyword_sources[kw].add(source)
            keyword_articles[kw].append(a)

    # 找出跨源命中的关键词
    strong_signals = {
        kw: sources
        for kw, sources in keyword_sources.items()
        if len(sources) >= min_sources
    }

    if not strong_signals:
        logger.info("Trend detection: no strong signals found (need %d+ sources)", min_sources)
        for a in articles:
            a["trend_signal"] = False
            a["trend_topic"] = ""
            a["trend_source_count"] = 0
            a["trend_confidence"] = ""
        return articles

    # 按命中源数排序，取 top 信号
    sorted_signals = sorted(strong_signals.items(), key=lambda x: len(x[1]), reverse=True)

    logger.info("Trend detection: found %d strong signal(s):", len(sorted_signals))
    for kw, sources in sorted_signals[:10]:
        logger.info("  '%s' — %d sources: %s", kw, len(sources), ", ".join(sorted(sources)[:5]))

    # 标记文章
    for a in articles:
        a["trend_signal"] = False
        a["trend_topic"] = ""
        a["trend_source_count"] = 0
        a["trend_confidence"] = ""

        text = f"{a.get('title', '')} {a.get('summary', '')}"
        tags = a.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        elif not isinstance(tags, list):
            tags = []
        keywords = set()
        for tag in tags:
            tag_clean = tag.strip().lower()
            if len(tag_clean) >= 2 and tag_clean not in _STOPWORDS:
                keywords.add(tag_clean)

        # 找该文章命中的最强信号
        best_kw = ""
        best_count = 0
        for kw in keywords:
            if kw in strong_signals and len(strong_signals[kw]) > best_count:
                best_kw = kw
                best_count = len(strong_signals[kw])

        if best_kw:
            a["trend_signal"] = True
            a["trend_topic"] = best_kw
            a["trend_source_count"] = best_count
            if best_count >= 5:
                a["trend_confidence"] = "high"
            elif best_count >= 3:
                a["trend_confidence"] = "medium"
            else:
                a["trend_confidence"] = "low"

    signal_count = sum(1 for a in articles if a["trend_signal"])
    logger.info("Trend detection: marked %d / %d articles as trend signals", signal_count, len(articles))
    return articles
