import { Type } from "avsc";

export const messageSchema = Type.forSchema({
  fields: [
    { name: "id", type: "string" },
    { name: "timestamp", type: "long" },
    { name: "message", type: "string" },
  ],
  name: "Message",
  type: "record",
});
