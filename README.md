# YouTube Playlist Length Calculator

A simple and efficient web application to calculate the total watch time of any YouTube playlist. Built with HTML, CSS, and JavaScript, featuring a secure backend API for YouTube data access.

## ✨ Features

### 🎯 Core Functionality
- **Playlist Length Calculation**: Calculate total watch time for any YouTube playlist
- **Video Range Selection**: Calculate duration for specific video ranges (e.g., videos 5-20)
- **Multiple Speed Calculations**: View durations at different playback speeds (0.75x, 1.25x, 1.5x, 2x)
- **Average Video Length**: See average duration per video
- **Video Count**: Display total number of videos in playlist/range

### 🖼️ Visual Features
- **Thumbnail Display**: Shows thumbnails for start and end videos when using ranges
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🚀 Quick Start

### Option 1: Use Deployed Version (Recommended)
1. Visit the deployed application
2. Paste any YouTube playlist URL or ID
3. Click "Calculate" to see results instantly

### Option 2: Deploy Your Own Version

#### Prerequisites
- YouTube Data API v3 key
- GitHub account
- Vercel account (free)

#### Setup Steps
1. **Fork this repository**
2. **Get YouTube API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create credentials (API Key)

3. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `YOUTUBE_API_KEY` = your API key
   - Deploy automatically

4. **Access Your App**:
   - Your app will be available at `https://your-project.vercel.app`
   - API key is now secure on the server!

## 📖 How to Use

### Basic Usage
1. **Enter Playlist**: Paste YouTube playlist URL or ID
2. **Calculate**: Click "Calculate" button
3. **View Results**: See total duration, video count, and averages

### Advanced Options
1. **Click "Advanced Options"** to expand range settings
2. **Set Range**: Enter "From Video #" and "To Video #"
3. **Calculate**: Get duration for specific video range
4. **View Thumbnails**: See start and end video thumbnails

### Supported URL Formats
- **Direct Playlist ID**: `PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`
- **YouTube URL**: `https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`
- **Embed URL**: `https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`

## 🛠️ Technical Details

### Architecture
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **API**: YouTube Data API v3
- **Deployment**: Vercel (free tier)

### File Structure
```
ytcalc/
├── index.html          # Main application interface
├── script.js           # Frontend JavaScript logic
├── style.css          # Styling
├── api/
│   └── playlist.js    # Backend API endpoint
└── README.md          # This file
```

### Key Features Implementation
- **Smart Error Handling**: Comprehensive error messages for all scenarios
- **Pattern Validation**: Backend validates URL patterns securely
- **Thumbnail Support**: Fetches and displays video thumbnails
- **Range Processing**: Efficiently processes video ranges
- **Responsive Grid**: Adaptive layout for different screen sizes

## 🔧 Development

### Local Development
1. **Clone repository**: `git clone <your-repo-url>`
2. **Open**: `index.html` in browser
3. **Note**: Requires deployed backend for full functionality

### Backend Development
- **API Endpoint**: `/api/playlist`
- **Method**: POST
- **Input**: `{ playlistUrl, fromVideoNum, toVideoNum }`
- **Output**: Playlist data with videos, durations, and thumbnails

## 🌟 Features Highlights

### Duration Calculations
- **Total Duration**: Sum of all video durations
- **Average Duration**: Mean duration per video
- **Speed Variations**:
  - 0.75x Speed (slower)
  - 1.25x Speed (faster)
  - 1.5x Speed (much faster)
  - 2x Speed (double speed)

### Range Features
- **Flexible Ranges**: Calculate any video range (e.g., 1-50, 25-100)
- **Visual Feedback**: Thumbnails for start and end videos
- **Direct Links**: Click thumbnails to watch videos
- **Range Validation**: Automatic validation of range inputs

### User Experience
- **Loading States**: Clear loading indicators
- **Error Messages**: Helpful error messages for all scenarios
- **Keyboard Support**: Enter key to calculate
- **Clear Function**: Reset all inputs and results

## 🔒 Security

- **API Key Protection**: Never exposed to client-side code
- **Server-Side Processing**: All YouTube API calls happen on server
- **Environment Variables**: Secure configuration management
- **CORS Handling**: Proper cross-origin request handling
- **Input Validation**: Server-side validation of all inputs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **YouTube Data API v3** for playlist data access
- **Vercel** for free hosting and serverless functions
- **Modern CSS** for responsive design and animations

---

**Built with ❤️ for the YouTube community**