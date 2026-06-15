import { handleItem } from "../../_lib/item-handler";

export async function onRequest(context) {
  return handleItem("zh-CN", context);
}
