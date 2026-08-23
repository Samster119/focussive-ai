const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'TimetableBlock'
      ORDER BY ordinal_position
    `;
    console.log('Columns in TimetableBlock:');
    result.forEach(c => console.log(' -', c.column_name, c.data_type, c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();