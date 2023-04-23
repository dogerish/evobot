import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { i18n } from "../utils/i18n";
import { config } from "../utils/config";

export default {
  data: new SlashCommandBuilder().setName("quit").setDescription(i18n.__("quit.description")),
	execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id != config.OWNERID)
      interaction.reply(i18n.__("quit.notOwner"));
    else
      interaction.reply(i18n.__("quit.result")).then(() => interaction.client.destroy());
	}
};
