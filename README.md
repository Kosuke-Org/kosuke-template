# Kosuke Template

Project template for [Kosuke](https://github.com/filopedraz/kosuke-core/).

## Contributing

### Database

We use PostgreSQL as the database. The database is configured in the docker-compose file. You need to setup the following environment variables in the `.env` file:

- `POSTGRES_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

And then you need to run the following command to create the database:

```bash
docker compose up -d
```

### Authentication

For authentication we use StackAuth, which is a Clerk open-source alternative. Right now, in the docker-comopse there are not the containers to self host StackAuth, so you need to use the StackAuth cloud service.

After you have created the project, you need to provide the following environment variables in the `.env` file:

- `NEXT_PUBLIC_STACK_AUTH_URL`
- `NEXT_PUBLIC_STACK_AUTH_SECRET`
- `NEXT_PUBLIC_STACK_AUTH_URL`

### Running the application

To run the full stack Next.js application, you need to run the following command:

```bash
npm install
npm run dev
```

This will start the application on `http://localhost:3000`.
