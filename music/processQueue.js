import { AudioPlayerStatus, createAudioResource, entersState, StreamType } from "@discordjs/voice";
import SoundCloud from "soundcloud-downloader";
import ytdl from "ytdl-core-discord";
import { config } from "../utils/config.js";
import { i18n } from "../utils/i18n.js";
import { canModifyQueue } from "../utils/queue.js";

const { PRUNING, STAY_TIME } = config;
const scdl = SoundCloud.create();

export async function processQueue(song, message) {
  const queue = message.client.queue.get(message.guild.id);
  var collector = queue.collector;
  // stop old queue collector
  if (collector && !collector.ended) collector.stop();
  if (queue.killer) {
    clearTimeout(queue.killer);
    queue.killer = undefined;
  }

  if (!song) {
    queue.killer = setTimeout(function () {
      queue.connection.destroy();
      queue.player.stop(true);
      message.client.queue.delete(message.guild.id);
      !PRUNING && queue.textChannel.send(i18n.__("play.leaveChannel"));
    }, STAY_TIME * 1000);

    !PRUNING && queue.textChannel.send(i18n.__("play.queueEnded")).catch(console.error);

    return;
  }

  let stream = null;
  const streamType = song.url.includes("youtube.com") ? StreamType.Opus : StreamType.OggOpus;

  try {
    if (song.url.includes("youtube.com")) {
      stream = await ytdl(song.url, { highWaterMark: 1 << 25 });
    } else if (song.url.includes("soundcloud.com")) {
      try {
        stream = await scdl.downloadFormat(song.url, 'audio/ogg; codecs="opus"');
      } catch (error) {
        stream = await scdl.downloadFormat(song.url, "audio/mpeg");
        streamType = "unknown";
      }
    }
  } catch (error) {
    if (queue) {
      queue.songs.shift();
      processQueue(queue.songs[0], message);
    }

    console.error(error);

    return message.channel.send(
      i18n.__mf("play.queueError", { error: error.message ? error.message : error })
    );
  }

  queue.resource = createAudioResource(stream, { inputType: streamType, inlineVolume: true });
  queue.resource.volume?.setVolumeLogarithmic(queue.volume / 100);

  queue.player.play(queue.resource);

  await entersState(queue.player, AudioPlayerStatus.Playing, 5e3);

  // set up new queue collector and now playing message
  try {
    var pm = queue.playingMessage = await message.client.commands.get("np").execute(message);
    await pm.react("⏭");
    await pm.react("⏯");
    await pm.react("🔇");
    await pm.react("🔉");
    await pm.react("🔊");
    await pm.react("🔁");
    await pm.react("🔀");
    await pm.react("⏹");
  } catch (error) {
    console.error(error);
  }

  const filter = (reaction, user) => user.id !== message.client.user.id;

  collector = queue.collector = pm.createReactionCollector({
    filter,
    time: song.duration > 0 ? song.duration * 1000 : 600000
  });

  collector.on("collect", async (reaction, user) => {
    if (!queue) return;
    const member = await message.guild.members.fetch(user);

    reaction.users.remove(user).catch(() => null);
    switch (reaction.emoji.name) {
      case "⏭":
        await message.client.commands.get("skip").execute(message);
        break;

      case "⏯":
        if (queue.player.state.status == AudioPlayerStatus.Playing) {
          await message.client.commands.get("pause").execute(message);
        } else {
          await message.client.commands.get("resume").execute(message);
        }
        break;

      case "🔇":
        if (!canModifyQueue(member, queue)) return i18n.__("common.errorNotChannel");
        queue.muted = !queue.muted;
        if (queue.muted) {
          queue.resource.volume.setVolumeLogarithmic(0);
          queue.textChannel.send(i18n.__mf("play.mutedSong", { author: user.username }))
            .catch(console.error);
        } else {
          queue.resource.volume.setVolumeLogarithmic(queue.volume / 100);
          queue.textChannel.send(i18n.__mf("play.unmutedSong", { author: user.username }))
            .catch(console.error);
        }
        break;

      case "🔉":
        if (queue.volume == 0) return;
        if (!canModifyQueue(member, queue)) return i18n.__("common.errorNotChannel");
        queue.volume = Math.max(queue.volume - 10, 0);
        queue.resource.volume.setVolumeLogarithmic(queue.volume / 100);
        queue.textChannel
          .send(i18n.__mf("play.decreasedVolume", { author: user.username, volume: queue.volume }))
          .catch(console.error);
        break;

      case "🔊":
        if (queue.volume == 100) return;
        if (!canModifyQueue(member, queue)) return i18n.__("common.errorNotChannel");
        queue.volume = Math.min(queue.volume + 10, 100);
        queue.resource.volume.setVolumeLogarithmic(queue.volume / 100);
        queue.textChannel
          .send(i18n.__mf("play.increasedVolume", { author: user.username, volume: queue.volume }))
          .catch(console.error);
        break;

      case "🔁":
        await message.client.commands.get("loop").execute(message);
        break;

      case "🔀":
        await message.client.commands.get("shuffle").execute(message);
        break;

      case "⏹":
        await message.client.commands.get("stop").execute(message);
        break;
    }
  });

  collector.on("end", () => pm.delete().catch(console.error));
}
