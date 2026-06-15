import { handleItem } from "../../_lib/item-handler";

export async function onRequest(context) {
  return handleItem("en", context);
}
