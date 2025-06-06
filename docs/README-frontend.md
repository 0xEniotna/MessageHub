# Telegram Sender Frontend

A modern, user-friendly web interface for the Telegram message sender tool. Built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Features

- **📝 Message Composer**: Write and send messages with live preview
- **👥 Group Management**: Create and manage multiple group lists
- **⏰ Message Scheduling**: Schedule messages for future delivery
- **📊 Dashboard**: Overview of all activities and statistics
- **💾 Data Management**: Export/import functionality for backups
- **🔧 Settings**: Easy configuration of Telegram API credentials
- **📱 Responsive Design**: Works perfectly on desktop and mobile

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **Deployment**: Vercel

## 📦 Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run development server:**

   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment on Vercel

### Option 1: Deploy from GitHub

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect Next.js and deploy

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI:**

   ```bash
   npm i -g vercel
   ```

2. **Deploy:**

   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project or create new
   - Configure project settings
   - Deploy!

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env.local` file for any environment-specific settings:

```env
# Optional: Backend API URL (if using a separate backend)
NEXT_PUBLIC_API_URL=https://your-backend-api.com

# Optional: Analytics or other services
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### Backend Integration

The frontend is designed to work with the Python Telegram backend. To integrate:

1. **Update API endpoints** in the components to point to your backend
2. **Configure CORS** on your backend to allow requests from your frontend domain
3. **Set up authentication** if needed

## 📁 Project Structure

```
telegram-bot/
├── app/                    # Next.js App Router
│   ├── components/         # React components
│   │   ├── MessageComposer.tsx
│   │   ├── GroupListManager.tsx
│   │   ├── ScheduleManager.tsx
│   │   └── SettingsPanel.tsx
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx           # Main dashboard
├── public/                 # Static assets
├── package.json           # Dependencies
├── tailwind.config.js     # Tailwind configuration
├── next.config.js         # Next.js configuration
└── vercel.json           # Vercel deployment config
```

## 🎨 Customization

### Styling

The app uses Tailwind CSS with a custom color palette. To customize:

1. **Edit `tailwind.config.js`** to change colors, fonts, etc.
2. **Modify `app/globals.css`** for global styles
3. **Update component classes** for specific styling

### Features

To add new features:

1. **Create new components** in `app/components/`
2. **Add new tabs** to the main dashboard
3. **Extend the data models** as needed

## 🔐 Security Considerations

- **API Credentials**: Never expose Telegram API credentials in the frontend
- **Data Storage**: Currently uses localStorage - consider encryption for sensitive data
- **HTTPS**: Always use HTTPS in production
- **CORS**: Configure backend CORS properly

## 📱 Mobile Support

The interface is fully responsive and works great on:

- 📱 Mobile phones
- 📱 Tablets
- 💻 Desktop computers

## 🐛 Troubleshooting

### Common Issues

1. **Build errors**: Make sure all dependencies are installed
2. **Styling issues**: Check Tailwind CSS configuration
3. **API errors**: Verify backend connection and CORS settings

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational and personal use. Please respect Telegram's terms of service.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review the console for errors
3. Ensure your backend is properly configured
4. Check network connectivity

## 🎯 Roadmap

Future enhancements:

- [ ] Real-time message status updates
- [ ] Message templates
- [ ] Advanced scheduling options
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Bulk operations
