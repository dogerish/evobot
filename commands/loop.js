import { i18n } from "../utils/i18n.js";
import { canModifyQueue } from "../utils/queue.js";

export default {
  name: "loop",
  aliases: ["l"],
  description: i18n.__("loop.description"),
  execute(message) {
    const queue = message.client.queue.get(message.guild.id);
    if (!queue) return message.channel.send(i18n.__("loop.errorNotQueue")).catch(console.error);
    if (!canModifyQueue(message.member)) return i18n.__("common.errorNotChannel");

    queue.loop = !queue.loop;

    return message
      .channel.send(i18n.__mf("loop.result", { author: message.author.username, loop: queue.loop ? i18n.__("common.on") : i18n.__("common.off") }))
      .catch(console.error);
  }
};
