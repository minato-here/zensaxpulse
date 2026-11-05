# ZensaxPulse

**ZensaxPulse** is a native Linux desktop application designed to provide
deep, local system intelligence, monitoring, diagnostics, and analytics.

The goal is to create a premium, reliable, and privacy-focused system
monitoring experience for Linux users.

## Project Vision

ZensaxPulse aims to provide:

- Real-time CPU monitoring and analytics
- GPU monitoring for NVIDIA, AMD, and Intel hardware
- Memory and swap monitoring
- Storage usage and disk health information
- Network interface monitoring and traffic analytics
- Process and service management
- System sensors and temperature monitoring
- System information and hardware diagnostics
- Historical monitoring and analytics
- Carefully controlled system management capabilities

## Supported Platforms

Initial targets:

- Arch Linux
- Ubuntu

The architecture should remain extensible to other Linux distributions.

## Privacy Philosophy

ZensaxPulse is strictly local-first and offline-capable.

- No cloud APIs
- No external API requests
- No telemetry
- No analytics sent to external servers
- No internet dependency during runtime
- No external data transmission

All monitoring and analytics are intended to run locally on the user's
machine.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Desktop framework | Tauri 2 |
| Frontend | React |
| Language | TypeScript |
| Frontend tooling | Vite |
| Backend | Rust |
| Styling | Tailwind CSS |
| Charts | Recharts |
| System monitoring | Linux `/proc`, `/sys`, system APIs |

## Design Philosophy

ZensaxPulse follows a premium neumorphic design language.

### Light Theme
- Orange accent
- Soft shadows
- Clean surfaces
- Minimal and readable layouts

### Dark Theme
- Violet accent
- Deep surfaces
- Subtle elevation
- High-contrast analytics

The application will feature a collapsible sidebar and dedicated sections
for detailed system analytics.

## Architecture Principles

- Modular architecture
- Local system data collection
- Native desktop integration
- Least-privilege system access
- Graceful handling of unsupported hardware metrics
- Clear separation between UI and system monitoring logic
- Reliable and efficient resource usage

Unsupported metrics should be reported as unavailable rather than fabricated.

## Development Environment

Required tools:

- Node.js
- pnpm
- Rust
- Cargo
- Tauri 2 prerequisites for Linux

## Running the Application

Install dependencies:

```bash
pnpm install
Run the development application:
pnpm tauri dev


Build the application:
pnpm tauri build


Development Workflow
This project uses Git for version control.

Changes should be implemented incrementally and committed with
descriptive commit messages.
Project Status
Currently in the initial development and foundation phase.
License
License to be determined.
