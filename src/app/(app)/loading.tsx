// Shown the moment a tab is clicked, while the page's data loads, so the portal responds instantly instead of freezing.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="page-skeleton">
      <div className="sk sk-title" />
      <div className="sk-row">
        <div className="sk sk-card" />
        <div className="sk sk-card" />
        <div className="sk sk-card" />
      </div>
      <div className="sk sk-block" />
    </div>
  );
}
