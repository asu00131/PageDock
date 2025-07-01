'use server';
/**
 * @fileOverview An AI flow for categorizing links.
 *
 * - categorizeLinks - A function that handles link categorization.
 * - CategorizeLinksInput - The input type for the categorizeLinks function.
 * - CategorizeLinksOutput - The return type for the categorizeLinks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeLinksInputSchema = z.object({
  links: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      title: z.string(),
    })
  ),
});
export type CategorizeLinksInput = z.infer<typeof CategorizeLinksInputSchema>;

const CategorizeLinksOutputSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string().describe('The name of the category.'),
      linkIds: z.array(z.string()).describe('An array of link IDs belonging to this category.'),
    })
  ).describe("An array of category objects, where each object contains the category name and a list of link IDs belonging to it."),
});
export type CategorizeLinksOutput = z.infer<typeof CategorizeLinksOutputSchema>;


const categorizeLinksPrompt = ai.definePrompt({
  name: 'categorizeLinksPrompt',
  input: {schema: CategorizeLinksInputSchema},
  output: {schema: CategorizeLinksOutputSchema},
  prompt: `You are an expert at organizing bookmarks. You will be given a list of links with titles and URLs. Your task is to categorize them into logical groups.

Here are the rules:
- EVERY single link provided must be assigned to a category.
- If you are unsure about a link, or it doesn't fit well into a common category, you MUST place it in a category named "杂项" (Miscellaneous).
- Do not create categories with only one link unless absolutely necessary. Try to group links logically.
- The output must be a valid JSON object matching the provided schema. The 'categories' field must be an array of objects.

Here are the links:
{{#each links}}
- ID: {{{id}}}, Title: {{{title}}}, URL: {{{url}}}
{{/each}}
`,
});

const categorizeLinksFlow = ai.defineFlow(
  {
    name: 'categorizeLinksFlow',
    inputSchema: CategorizeLinksInputSchema,
    outputSchema: CategorizeLinksOutputSchema,
  },
  async (links) => {
    const { output } = await categorizeLinksPrompt(links);
    return output!;
  }
);

export async function categorizeLinks(input: CategorizeLinksInput): Promise<CategorizeLinksOutput> {
  return categorizeLinksFlow(input);
}
