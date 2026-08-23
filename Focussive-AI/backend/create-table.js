const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTable() {
  try {
    // Check if table exists
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'timetable_blocks'
    `;
    
    if (result.length === 0) {
      console.log('Creating timetable_blocks table...');
      await prisma.$executeRaw`
        CREATE TABLE timetable_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          day_of_week INTEGER NOT NULL,
          start_time VARCHAR(5) NOT NULL,
          end_time VARCHAR(5) NOT NULL,
          activity_type VARCHAR(20) NOT NULL,
          task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
          template_id UUID
        )
      `;
      console.log('Table created successfully!');
    } else {
      console.log('Table already exists.');
      // Check if task_id column exists
      const colResult = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'timetable_blocks' AND column_name = 'task_id'
      `;
      if (colResult.length === 0) {
        console.log('Adding task_id column...');
        await prisma.$executeRaw`
          ALTER TABLE timetable_blocks 
          ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL
        `;
        console.log('Column added!');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTable();