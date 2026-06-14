const feedbackItems = ["反馈问题", "加入内测群", "我想要的功能"] as const;

export function FeedbackLink() {
  const feedbackUrl = process.env.FEEDBACK_URL;

  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-28 pt-2 md:max-w-5xl md:px-6 md:pb-8">
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        {feedbackUrl ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {feedbackItems.map((item) => (
              <a
                className="font-medium text-primary hover:underline"
                href={feedbackUrl}
                key={item}
                rel="noreferrer"
                target="_blank"
              >
                {item}
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {feedbackItems.map((item) => (
              <a className="font-medium text-primary hover:underline" href="/feedback" key={item}>
                {item}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
