import { i18n } from "../utils/i18n.js";

export default {
  name: "ping",
  cooldown: 10,
  description: i18n.__("ping.description"),
  execute(message) {
    message
      .channel.send(i18n.__mf("ping.result", { ping: Math.round(message.client.ws.ping) }))
      .catch(console.error);
  }
};
