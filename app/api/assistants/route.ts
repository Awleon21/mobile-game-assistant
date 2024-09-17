import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Create a new assistant
export async function POST() {
  const assistant = await openai.beta.assistants.create({
    instructions: "Your purpose is to help me with the mobile game Marvel Strike Force.",
    name: "Marvel Strike Force Assistant",
    model: "gpt-4o",
    tools: [
      { type: "code_interpreter" },
      {
        type: "function",
        function: {
          name: "get_roster",
          description: "Retrieves the Marvel Strike Force roster of the user.",
          parameters: {
            type: "object",
            properties: {
              page: {
                type: "integer",
                description: "The page number for pagination.",
              },
              perPage: {
                type: "integer",
                description: "The number of items to display per page.",
              },
            },
            required: ["page", "perPage"],  // Adjust based on your API’s requirements
          },
        },
      },
      { type: "file_search" },
    ],
  });
  return Response.json({ assistantId: assistant.id });
}
