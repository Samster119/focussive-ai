const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addColumn() {
  try {
    await prisma.$executeRaw`
      ALTER TABLE "TimetableBlock" 
      ADD COLUMN "taskId" UUID REFERENCES "Task"(id) ON DELETE SET NULL
    `;
    console.log('taskId column added successfully!');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addColumn();