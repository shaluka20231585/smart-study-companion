import { consumeStream, convertToModelMessages, streamText, type UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, documentContent }: { messages: UIMessage[]; documentContent?: string } =
    await req.json()

  const systemPrompt = documentContent
    ? `You are a helpful AI study tutor. You have access to the following document content and should answer questions based on it.
If the question is not related to the document content, politely guide the user back to the study material.
Be encouraging and supportive in your responses.
When explaining concepts, use simple language and provide examples when helpful.
Format your responses with clear paragraphs and use bullet points when listing items.

Document Content:
${documentContent.slice(0, 25000)}`
    : `You are a helpful AI study tutor. Help students with their learning questions.
Be encouraging and supportive in your responses.
When explaining concepts, use simple language and provide examples when helpful.
If students don't have a specific document loaded, offer general study tips and help them understand concepts.`

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
