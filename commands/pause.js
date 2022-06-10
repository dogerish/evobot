import { i18n } from "../utils/i18n.js";
import { canModifyQueue } from "../utils/queue.js";

export default {
  name: "pause",
  description: i18n.__("pause.description"),
  execute(message) {
    const queue = message.client.queue.get(message.guild.id);

    if (!queue) return message.channel.send(i18n.__("pause.errorNotQueue")).catch(console.error);
    if (!canModifyQueue(message.member)) return i18n.__("common.errorNotChannel");

    if (queue.player.pause()) {
      queue.textChannel.send(i18n.__mf("pause.result", { author: message.author.username })).catch(console.error);
      return true;
    }
  }
};
