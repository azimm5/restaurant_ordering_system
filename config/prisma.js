const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const isLocal = (process.env.DATABASE_URL || '').includes('localhost');

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;