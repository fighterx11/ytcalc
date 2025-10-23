// api/playlist.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playlistUrl, fromVideoNum, toVideoNum } = req.body;

    if (!playlistUrl) {
      return res.status(400).json({ error: "Playlist URL is required" });
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

    if (!YOUTUBE_API_KEY) {
      throw new Error("YouTube API key not configured");
    }

    // Convert ISO 8601 duration into seconds
    const parseDuration = (duration) => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return 0;
      const hours = parseInt(match[1] || "0", 10);
      const minutes = parseInt(match[2] || "0", 10);
      const seconds = parseInt(match[3] || "0", 10);
      return hours * 3600 + minutes * 60 + seconds;
    };

    // Fetch playlist ID from url
    const extractPlaylistId = (url) => {
      if (/^[A-Za-z0-9_-]{34}$/.test(url)) {
        return url;
      }
      const patterns = [
        /[&?]list=([^&]+)/,
        /playlist\?list=([^&]+)/,
        /embed\/videoseries\?list=([^&]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      return res.status(400).json({ error: "Invalid YouTube playlist URL or ID." });
    }

    // Fetch basic playlist info
    const playlistResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
    );

    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json();
      throw new Error(`Failed to fetch playlist info: ${errorData.error?.message || playlistResponse.status}`);
    }

    const playlistData = await playlistResponse.json();
    if (playlistData.items.length === 0) {
      throw new Error("Playlist not found or is private.");
    }

    const playlistInfo = playlistData.items[0];

    // Fetch playlist videos
    const videoIds = [];
    let nextPageToken = "";

    do {
      const videosResponse = await fetch(
        `${YOUTUBE_API_BASE_URL}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`
      );

      if (!videosResponse.ok) {
        const errorData = await videosResponse.json();
        throw new Error(`Failed to fetch playlist videos: ${errorData.error?.message || videosResponse.status}`);
      }

      const videosData = await videosResponse.json();
      videosData.items.forEach((item) => {
        if (item.contentDetails && item.contentDetails.videoId) {
          videoIds.push(item.contentDetails.videoId);
        }
      });
      nextPageToken = videosData.nextPageToken || "";
    } while (nextPageToken);

    if (videoIds.length === 0) {
      if (playlistInfo.contentDetails.itemCount === 0) {
        return res.json({
          id: playlistId,
          title: playlistInfo.snippet.title,
          channelTitle: playlistInfo.snippet.channelTitle,
          videoCount: 0,
          actualVideoCount: 0,
          videos: [],
          range: undefined,
        });
      } else {
        throw new Error("Found 0 videos via API, but playlist might not be empty.");
      }
    }

    const totalReportedCount = videoIds.length;
    let selectedVideoIds = videoIds;
    let range = undefined;

    // Validate and apply range
    const from = fromVideoNum ? parseInt(fromVideoNum, 10) : 1;
    const to = toVideoNum ? parseInt(toVideoNum, 10) : totalReportedCount;

    if (
      isNaN(from) ||
      isNaN(to) ||
      from < 1 ||
      to < 1 ||
      from > totalReportedCount ||
      to > totalReportedCount ||
      from > to
    ) {
      if (fromVideoNum || toVideoNum) {
        throw new Error(`Invalid video range. Playlist has ${totalReportedCount} videos.`);
      }
      selectedVideoIds = videoIds;
      range = { from: 1, to: totalReportedCount };
    } else {
      selectedVideoIds = videoIds.slice(from - 1, to);
      range = { from: from, to: to };
    }

    if (selectedVideoIds.length === 0 && (fromVideoNum || toVideoNum)) {
      throw new Error("No videos found in the specified range.");
    }

    // Fetch video details in batches
    const videos = [];
    const batchSize = 50;
    const originalIndices = {};
    selectedVideoIds.forEach((id, index) => {
      originalIndices[id] = index;
    });

    for (let i = 0; i < selectedVideoIds.length; i += batchSize) {
      const batch = selectedVideoIds.slice(i, i + batchSize);
      const detailsResponse = await fetch(
        `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails&id=${batch.join(",")}&key=${YOUTUBE_API_KEY}`
      );

      if (!detailsResponse.ok) {
        const errorData = await detailsResponse.json();
        throw new Error(`Failed to fetch video details: ${errorData.error?.message || detailsResponse.status}`);
      }

      const detailsData = await detailsResponse.json();
      const batchVideos = detailsData.items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        duration: parseDuration(item.contentDetails.duration),
        position: originalIndices[item.id] + 1,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      }));
      videos.push(...batchVideos);
    }

    videos.sort((a, b) => a.position - b.position);

    res.json({
      id: playlistId,
      title: playlistInfo.snippet.title,
      channelTitle: playlistInfo.snippet.channelTitle,
      videoCount: totalReportedCount,
      actualVideoCount: videos.length,
      videos: videos,
      range: range,
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
