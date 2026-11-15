import { z } from 'zod'
import { CARD_PRESETS } from './units'

export const DueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('today') }),
  z.object({ kind: z.literal('date'), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
])

export const SourceSchema = z.object({
  kind: z.enum(['menubar', 'dashboard', 'api', 'cli', 'iphone', 'mcp', 'llm']),
  label: z.string().trim().max(40).optional()
})

export const PrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const SlipInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is empty').max(500),
  note: z.string().trim().max(2000).optional(),
  priority: PrioritySchema.optional(),
  due: DueSchema.nullable().optional(),
  tag: z.string().trim().max(40).nullable().optional(),
  designId: z.string().max(60).optional(),
  card: z.enum(CARD_PRESETS as [string, ...string[]]).optional(),
  source: SourceSchema,
  idempotencyKey: z.string().max(120).optional(),
  batchId: z.string().max(60).optional(),
  print: z.boolean().optional()
})

/** Raw quick-syntax text (popover, CLI, Shortcuts, Raycast). */
export const QuickInputSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  note: z.string().trim().max(2000).optional(),
  designId: z.string().max(60).optional(),
  source: SourceSchema.optional(),
  idempotencyKey: z.string().max(120).optional(),
  print: z.boolean().optional()
})

export type SlipInputParsed = z.infer<typeof SlipInputSchema>
