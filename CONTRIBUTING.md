# Contributing to WCAI Studio

Thank you for your interest in contributing to WCAI Studio! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We expect all contributors to:
- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/wcai-studio.git
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/original-owner/wcai-studio.git
   ```
4. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with required API key:
   ```env
   LUMAAI_API_KEY=your_lumaai_api_key
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Write unit tests for new features
- Ensure all tests pass before submitting a PR

### TypeScript Guidelines

- Enable strict mode
- Use proper type annotations
- Avoid using `any` type
- Use interfaces for object shapes
- Use enums for fixed sets of values

### React Guidelines

- Use functional components
- Use hooks for state management
- Follow React best practices
- Keep components small and focused
- Use proper prop types

## Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code refactoring
- test: Adding or modifying tests
- chore: Maintenance tasks

Example:
```
feat(video): add support for custom video dimensions

- Added width and height controls
- Updated video preview component
- Added validation for dimensions
```

## Pull Request Process

1. Update your fork with the latest changes from upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Ensure your changes:
   - Include relevant tests
   - Update documentation as needed
   - Follow coding standards
   - Pass all existing tests

3. Submit a pull request:
   - Use a clear and descriptive title
   - Fill out the PR template completely
   - Link any related issues
   - Add screenshots if applicable

4. Code review process:
   - Maintainers will review your code
   - Address any requested changes
   - Once approved, your PR will be merged

## Testing

- Write tests for new features
- Update tests for modified code
- Run the test suite before submitting:
  ```bash
  npm run test
  ```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API documentation if needed
- Include examples for new features

## Need Help?

- Open an issue for bugs or feature requests
- Ask questions in the project's discussions
- Tag maintainers for urgent issues

## License

By contributing to WCAI Studio, you agree that your contributions will be licensed under the project's MIT License.
