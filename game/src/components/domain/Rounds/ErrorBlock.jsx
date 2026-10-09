import { Link } from "react-router-dom";
import { BorderContainer } from "../../layout/BorderContainer";
import { Button } from "../../ui/Button";

export function ErrorBlock({ error }) {
  return (
    <BorderContainer border="all" className="p-8 text-center space-y-4">
      <p className="text-wrong font-medium">Could not load rounds</p>
      <p className="text-ink-muted text-sm">{error.message}</p>
      <Link to="/setup"><Button variant="secondary">← Back to setup</Button></Link>
    </BorderContainer>
  );
}
