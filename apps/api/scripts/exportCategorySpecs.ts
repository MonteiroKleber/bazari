// V-1 exportCategorySpecs.ts
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
const prisma = new PrismaClient()
;(async () => {
  const data = await prisma.categorySpec.findMany({
    select: { categoryId: true, version: true, jsonSchema: true, uiSchema: true, indexHints: true, inheritsFrom: true }
  })
  writeFileSync('category-specs-export.json', JSON.stringify(data, null, 2))
  console.log('✅ Exportado para category-specs-export.json')
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
