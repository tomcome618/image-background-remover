# Image Background Remover 🖼️

An AI-powered tool to remove backgrounds from images automatically.

## Features

- 🚀 **Fast processing** - Remove backgrounds in seconds
- 🎯 **High accuracy** - AI-powered segmentation
- 📱 **Multiple formats** - Support for JPG, PNG, WebP, etc.
- 🎨 **Transparent output** - Generate PNG with alpha channel
- 🔧 **Easy to use** - Simple command-line interface

## Installation

```bash
# Clone the repository
git clone https://github.com/tomcome618/image-background-remover.git
cd image-background-remover

# Install dependencies
npm install
```

## Usage

```bash
# Basic usage
node remove-background.js input.jpg output.png

# With custom options
node remove-background.js --model=fast --quality=high input.jpg output.png
```

## API Example

```javascript
const { removeBackground } = require('./src/remover');

// Remove background from an image
const result = await removeBackground('input.jpg', {
  model: 'u2net',
  outputFormat: 'png'
});

console.log(`Background removed: ${result.outputPath}`);
```

## Supported Models

- **U2Net** - General purpose, good balance of speed and accuracy
- **BASNet** - Higher accuracy, slower processing
- **MODNet** - Optimized for human portraits
- **Fast** - Quick processing for simple backgrounds

## Requirements

- Node.js 16+
- Python 3.8+ (for some AI models)
- 2GB+ RAM recommended

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- Built with modern AI/ML technologies
- Inspired by various open-source background removal tools
- Thanks to all contributors and users!