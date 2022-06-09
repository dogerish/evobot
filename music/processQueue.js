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

  if (!song) {
    setTimeout(function () {
      queue.connection.destroy();
      queue.player.stop(true);
      !PRUNING && queue.textChannel.send(i18n.__("play.leaveChannel"));
    }, STAY_TIME * 1000);

    !PRUNING && queue.textChannel.send(i18n.__("play.queueEnded")).catch(console.error);

    return message.client.queue.delete(message.guild.id);
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
}
