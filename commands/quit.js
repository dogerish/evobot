import i18n from "i18n";
import { config } from "../utils/config.js";
const { OWNERID } = config;

export default {
	name: "quit",
	description: i18n.__("quit.description"),
	async execute(message) {
		if (message.author.id != OWNERID) 
			message.channel.send(i18n.__("quit.notOwner"));
		else
			message.channel.send(i18n.__("quit.result")).then(() => message.client.destroy());
	}
};
