import {
  DEFAULT_FEEDBACK_TICKET_FRAMEWORK,
  type LumosProvider,
  type FeedbackTicketFramework,
} from "@lumos/shared";

export function inferFeedbackFrameworkFromAgentProvider(
  _provider: LumosProvider | null | undefined,
): FeedbackTicketFramework {
  return DEFAULT_FEEDBACK_TICKET_FRAMEWORK;
}
