import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-28 md:pb-10" data-testid="feedback-page">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold leading-tight">内测反馈</h1>
        <p className="text-sm text-muted-foreground">
          告诉恐龙侠哪里顺、哪里卡、你还想要什么能力。
        </p>
      </section>

      <FeedbackForm />
    </div>
  );
}
