// --- Backend API Logic ---
const API_BASE_URL = window.location.origin; // Use same origin as the frontend

// Fetch playlist data from backend
const fetchPlaylistData = async (playlistUrl, fromVideoNum, toVideoNum) => {
	const response = await fetch(`${API_BASE_URL}/api/playlist`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			playlistUrl,
			fromVideoNum,
			toVideoNum
		})
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || `Server error: ${response.status}`);
	}

	return await response.json();
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
	const isHidden =
		window.getComputedStyle(advancedOptionsDiv).display === "none";

	if (isHidden) {
		advancedOptionsDiv.style.display = "block";
		advancedOptionsDiv.offsetHeight;
		advancedOptionsDiv.classList.add("show");
		advancedToggle.textContent = "Advanced Options ▲";
	} else {
		advancedOptionsDiv.classList.remove("show");
		advancedOptionsDiv.style.display = "none";
		advancedToggle.textContent = "Advanced Options ▼";
	}
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
	advancedOptionsDiv.classList.remove("show");
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
