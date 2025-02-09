# Personal CRM

A modern web application for managing your personal and professional relationships. Built with Next.js, Prisma, and Tailwind CSS.

## Features

- Contact management with detailed profiles
- Photo upload and cropping support via Cloudinary
- Birthday tracking
- Contact tagging and search
- Event logging for interactions
- Two-way relationship management (mutual and directional)
- Responsive design for both desktop and mobile
- Modern, clean UI with Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Cloudinary account for image hosting

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pcrm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables by creating a `.env` file:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/pcrm?schema=public"
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

4. Set up the database:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Schema

The application uses the following main models:

- **Contact**: Stores basic contact information, including name, birthday, photo, and contact details
- **Tag**: Allows categorization of contacts
- **Event**: Logs interactions and important dates for each contact
- **Relationship**: Manages connections between contacts, supporting both mutual and directional relationships

## API Routes

- `/api/contacts`: List and create contacts
- `/api/contacts/[id]`: Get, update, and delete individual contacts
- `/api/contacts/[id]/events`: Manage events for a contact
- `/api/contacts/[id]/relationships`: Manage relationships between contacts
- `/api/tags`: List available tags

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
