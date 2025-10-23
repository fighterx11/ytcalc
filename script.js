// --- YouTube API Logic ---
//const YOUTUBE_API_KEY = "YOUR_YOUTUBE_API_KEY"; // <-- IMPORTANT: Enter your API Key here!
const YOUTUBE_API_KEY = "AIzaSyA8L0hHiGdjUR_gdbooGNf9i9gpyxoewLk";
const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

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
		// Direct ID check
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

// Fetch basic playlist info
const fetchPlaylistInfo = async (playlistId) => {
	if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY") {
		throw new Error(
			"YouTube API Key missing! Please add it in the script."
		);
	}
	const response = await fetch(
		`${YOUTUBE_API_BASE_URL}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
	);
	if (!response.ok) {
		const errorData = await response.json();
		console.error("API Error (Playlist Info):", errorData);
		throw new Error(
			`Failed to fetch playlist info (Status: ${response.status}). Check console for details.`
		);
	}
	const data = await response.json();
	if (data.items.length === 0) {
		throw new Error("Playlist not found or is private.");
	}
	return data.items[0];
};

// Playlist ke saare video IDs fetch karna (pages handle karke)
const fetchPlaylistVideos = async (playlistId) => {
	const videoIds = [];
	let nextPageToken = "";
	do {
		const response = await fetch(
			`${YOUTUBE_API_BASE_URL}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`
		);
		if (!response.ok) {
			const errorData = await response.json();
			console.error("API Error (Playlist Items):", errorData);
			throw new Error(
				`Failed to fetch playlist videos (Status: ${response.status}). Check console.`
			);
		}
		const data = await response.json();
		// Filter out videos that might be deleted or private after being added
		data.items.forEach((item) => {
			if (item.contentDetails && item.contentDetails.videoId) {
				videoIds.push(item.contentDetails.videoId);
			} else {
				console.warn("Skipping item without videoId:", item);
			}
		});
		nextPageToken = data.nextPageToken || "";
	} while (nextPageToken);
	return videoIds;
};

// Video details (duration, title) fetch karna batches mein
const fetchVideoDetails = async (videoIds) => {
	const videos = [];
	const batchSize = 50;
	const originalIndices = {}; // Store original index for sorting later
	videoIds.forEach((id, index) => {
		originalIndices[id] = index;
	});

	for (let i = 0; i < videoIds.length; i += batchSize) {
		const batch = videoIds.slice(i, i + batchSize);
		const response = await fetch(
			`${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails&id=${batch.join(
				","
			)}&key=${YOUTUBE_API_KEY}`
		);
		if (!response.ok) {
			const errorData = await response.json();
			console.error("API Error (Video Details):", errorData);
			throw new Error(
				`Failed to fetch video details (Status: ${response.status}). Check console.`
			);
		}
		const data = await response.json();

		const batchVideos = data.items.map((item) => ({
			id: item.id,
			title: item.snippet.title,
			duration: parseDuration(item.contentDetails.duration),
			position: originalIndices[item.id] + 1, // Use original index + 1
			thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
		}));

		videos.push(...batchVideos);
	}
	// Ensure the videos are in the original playlist order
	videos.sort((a, b) => a.position - b.position);
	return videos;
};

// Main function jo sab fetch karke data laata hai
const fetchPlaylistData = async (playlistUrl, fromVideoNum, toVideoNum) => {
	const playlistId = extractPlaylistId(playlistUrl);
	if (!playlistId) {
		throw new Error("Invalid YouTube playlist URL or ID.");
	}

	try {
		const playlistInfo = await fetchPlaylistInfo(playlistId);
		const allVideoIds = await fetchPlaylistVideos(playlistId);

		if (allVideoIds.length === 0) {
			// Check if playlist itself reported 0 items
			if (playlistInfo.contentDetails.itemCount === 0) {
				return {
					// Return minimal info for empty playlist
					id: playlistId,
					title: playlistInfo.snippet.title,
					channelTitle: playlistInfo.snippet.channelTitle,
					videoCount: 0,
					actualVideoCount: 0,
					videos: [],
					range: undefined,
				};
			} else {
				// API might have issues listing items, but playlist claims items exist
				throw new Error(
					"Found 0 videos via API, but playlist might not be empty. Check permissions or try again."
				);
			}
		}

		const totalReportedCount = allVideoIds.length; // Count before filtering

		let selectedVideoIds = allVideoIds;
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
			// Only throw error if user provided invalid input, not if fields were empty
			if (fromVideoNum || toVideoNum) {
				throw new Error(
					`Invalid video range. Playlist has ${totalReportedCount} videos.`
				);
			}
			// If fields were empty, use default full range
			selectedVideoIds = allVideoIds;
			range = { from: 1, to: totalReportedCount };
		} else {
			// Valid range provided or default full range used
			selectedVideoIds = allVideoIds.slice(from - 1, to);
			range = { from: from, to: to };
		}

		if (selectedVideoIds.length === 0 && (fromVideoNum || toVideoNum)) {
			throw new Error("No videos found in the specified range.");
		} else if (selectedVideoIds.length === 0) {
			// This case should ideally be caught earlier, but added for safety
			throw new Error("No videos selected to fetch details.");
		}

		const videos = await fetchVideoDetails(selectedVideoIds);

		return {
			id: playlistId,
			title: playlistInfo.snippet.title,
			channelTitle: playlistInfo.snippet.channelTitle,
			videoCount: totalReportedCount, // Total videos before range filter
			actualVideoCount: videos.length, // Videos actually processed
			videos: videos,
			range: range,
		};
	} catch (error) {
		console.error("Error in fetchPlaylistData:", error);
		// Re-throw specific errors or a generic one
		if (
			error instanceof Error &&
			(error.message.includes("API Key") ||
				error.message.includes("not found") ||
				error.message.includes("Invalid") ||
				error.message.includes("range"))
		) {
			throw error; // Let specific errors pass through
		}
		throw new Error(
			"Failed to fetch playlist data. Check URL/ID, API Key, and permissions."
		);
	}
};

// --- UI Logic ---

// HTML elements ke references lena
const playlistUrlInput = document.getElementById("playlist-url");
const fromVideoInput = document.getElementById("from-video");
const toVideoInput = document.getElementById("to-video");
const calculateButton = document.getElementById("calculate-button");
const clearButton = document.getElementById("clear-button");
const loadingMessage = document.getElementById("loading-message");
const errorMessageDiv = document.getElementById("error-message");
const resultsArea = document.getElementById("results-area");

// Result display elements
const playlistTitleEl = document.getElementById("playlist-title");
const playlistChannelEl = document.getElementById("playlist-channel");
const videoCountEl = document.getElementById("video-count");
const totalDurationEl = document.getElementById("total-duration");
const averageDurationEl = document.getElementById("average-duration");
const rangeAppliedEl = document.getElementById("range-applied");
const duration075xEl = document.getElementById("duration-075x");
const duration125xEl = document.getElementById("duration-125x");
const duration150xEl = document.getElementById("duration-150x");
const duration200xEl = document.getElementById("duration-200x");
const startEndVideosEl = document.getElementById("start-end-videos");
const startVideoTitleEl = document.getElementById("start-video-title");
const startVideoLinkEl = document.getElementById("start-video-link");
const startVideoThumbnailEl = document.getElementById("start-video-thumbnail");
const endVideoTitleEl = document.getElementById("end-video-title");
const endVideoLinkEl = document.getElementById("end-video-link");
const endVideoThumbnailEl = document.getElementById("end-video-thumbnail");

// Advanced options toggle
const advancedToggle = document.getElementById("advanced-toggle");
const advancedOptionsDiv = document.getElementById("advanced-options");

advancedToggle.addEventListener("click", () => {
	const isHidden = advancedOptionsDiv.style.display === "none";
	advancedOptionsDiv.style.display = isHidden ? "block" : "none";
	advancedToggle.textContent = isHidden
		? "Advanced Options ▲"
		: "Advanced Options ▼";
});

// Show duration in (d h m s) format
const formatDuration = (seconds) => {
	if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) {
		return "0m 0s";
	}
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60); // Use Math.floor for display

	let result = "";
	if (days > 0) result += `${days}d `;
	if (hours > 0 || days > 0) result += `${hours}h `; // Show hours if days exist
	if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `; // Show minutes if hours/days exist
	result += `${secs}s`;

	return result.trim() || "0s"; // Handle case where duration is less than 1 second
};

// Average duration calculate aur format karna
const formatAverageDuration = (totalSeconds, videoCount) => {
	if (
		videoCount === 0 ||
		typeof totalSeconds !== "number" ||
		isNaN(totalSeconds)
	)
		return "0m 0s";
	const avgSeconds = Math.round(totalSeconds / videoCount);
	return formatDuration(avgSeconds);
};

// Error message dikhana
const showError = (message) => {
	errorMessageDiv.textContent = message;
	errorMessageDiv.style.display = "block";
	resultsArea.style.display = "none"; // Hide results on error
};

// Show loading message
const showLoading = (isLoading) => {
	loadingMessage.style.display = isLoading ? "block" : "none";
	calculateButton.disabled = isLoading;
	errorMessageDiv.style.display = "none"; // Hide error when loading starts
	if (isLoading) {
		resultsArea.style.display = "none"; // Hide previous results when loading
	}
};

// Calculate button function
const handleCalculate = async () => {
	const playlistUrl = playlistUrlInput.value.trim();
	const fromVideo = fromVideoInput.value.trim();
	const toVideo = toVideoInput.value.trim();

	if (!playlistUrl) {
		showError("Please enter a YouTube playlist URL or ID.");
		return;
	}

	const playlistId = extractPlaylistId(playlistUrl);
	if (!playlistId) {
		showError("Please enter a valid YouTube playlist URL or ID.");
		return;
	}

	showLoading(true);

	try {
		// Fetch data
		const data = await fetchPlaylistData(playlistUrl, fromVideo, toVideo);

		// Calculate total duration
		const totalDurationSeconds = data.videos.reduce(
			(sum, video) => sum + video.duration,
			0
		);

		// Display results - Handle empty playlist explicitly
		if (data.actualVideoCount === 0 && data.videoCount === 0) {
			playlistTitleEl.textContent = data.title;
			playlistChannelEl.textContent = data.channelTitle;
			videoCountEl.textContent = "0";
			totalDurationEl.textContent = "0m 0s";
			averageDurationEl.textContent = "0m 0s";
			rangeAppliedEl.textContent = "N/A (Empty Playlist)";
			duration075xEl.textContent = "0m 0s";
			duration125xEl.textContent = "0m 0s";
			duration150xEl.textContent = "0m 0s";
			duration200xEl.textContent = "0m 0s";
			startEndVideosEl.style.display = "none"; // Hide start/end section
		} else {
			// Update playlist info
			playlistTitleEl.textContent = data.title;
			playlistChannelEl.textContent = data.channelTitle;
			videoCountEl.textContent = data.actualVideoCount; // Show count within range
			totalDurationEl.textContent = formatDuration(totalDurationSeconds);
			averageDurationEl.textContent = formatAverageDuration(
				totalDurationSeconds,
				data.actualVideoCount
			);
			rangeAppliedEl.textContent = data.range
				? `${data.range.from}-${data.range.to} (of ${data.videoCount})`
				: `Full (1-${data.videoCount})`;

			// Update durations for different speeds
			duration075xEl.textContent = formatDuration(
				totalDurationSeconds / 0.75
			);
			duration125xEl.textContent = formatDuration(
				totalDurationSeconds / 1.25
			);
			duration150xEl.textContent = formatDuration(
				totalDurationSeconds / 1.5
			);
			duration200xEl.textContent = formatDuration(
				totalDurationSeconds / 2
			);

			// Update start/end video info if available
			const startVideo = data.videos[0];
			const endVideo = data.videos[data.videos.length - 1];

			if (startVideo && endVideo && data.range) {
				// Only show if range was applied and videos exist
				startVideoTitleEl.textContent = `#${data.range.from}: ${startVideo.title}`;
				startVideoLinkEl.href = `https://www.youtube.com/watch?v=${startVideo.id}&list=${data.id}&index=${data.range.from}`;
				startVideoThumbnailEl.src = startVideo.thumbnail || "";
				startVideoThumbnailEl.alt = `Thumbnail for: ${startVideo.title}`;

				endVideoTitleEl.textContent = `#${data.range.to}: ${endVideo.title}`;
				endVideoLinkEl.href = `https://www.youtube.com/watch?v=${endVideo.id}&list=${data.id}&index=${data.range.to}`;
				endVideoThumbnailEl.src = endVideo.thumbnail || "";
				endVideoThumbnailEl.alt = `Thumbnail for: ${endVideo.title}`;

				startEndVideosEl.style.display = "block";
			} else {
				startEndVideosEl.style.display = "none";
			}
		}

		resultsArea.style.display = "block"; // Show results
		errorMessageDiv.style.display = "none"; // Hide any previous error
	} catch (err) {
		console.error("Calculation Error:", err);
		showError(err.message || "An unexpected error occurred.");
		resultsArea.style.display = "none";
	} finally {
		showLoading(false);
	}
};

// Clear button function
const handleClear = () => {
	playlistUrlInput.value = "";
	fromVideoInput.value = "";
	toVideoInput.value = "";
	errorMessageDiv.style.display = "none";
	resultsArea.style.display = "none";
	// Reset advanced options visibility if needed
	advancedOptionsDiv.style.display = "none";
	advancedToggle.textContent = "Advanced Options ▼";
};

// Buttons pe event listener lagana
calculateButton.addEventListener("click", handleCalculate);
clearButton.addEventListener("click", handleClear);

// Optional: Allow pressing Enter in the URL input to trigger calculate
playlistUrlInput.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		handleCalculate();
	}
});
