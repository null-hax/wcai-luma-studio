# WCAI Studio

WCAI Studio is a modern web application that enables users to generate and manage videos using AI technologies. Built with Next.js and powered by LumaAI, it provides an intuitive interface for video generation and manipulation.

## Features

- AI-powered video generation
- Video settings customization
- Grid-based video display
- Real-time video playback
- Responsive design with Tailwind CSS
- TypeScript support for type safety

## Prerequisites

Before you begin, ensure you have:
- Node.js 18.x or later
- npm or yarn package manager
- LumaAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wcai-studio.git
cd wcai-studio
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Headless UI](https://headlessui.com/) - UI components
- [LumaAI](https://lumalabs.ai/) - AI video generation
- [TanStack Virtual](https://tanstack.com/virtual/v3) - Virtual list rendering

## Project Structure

```
src/
├── api/              # API utilities
├── app/              # Next.js app router
├── components/       # React components
└── types/           # TypeScript type definitions
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/wcai-studio/issues/new) on GitHub.
