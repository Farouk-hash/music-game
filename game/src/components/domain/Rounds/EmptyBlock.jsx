import { Link } from "react-router-dom";
import { BorderContainer } from "../../layout/BorderContainer";
import { Button } from "../../ui/Button";

export function EmptyBlock() {
  return (
    <BorderContainer border="all" className="p-8 text-center space-y-4">
      <p className="text-ink">No rounds available for that selection.</p>
      <Link to="/setup"><Button variant="secondary">← Pick something else</Button></Link>
    </BorderContainer>
  );
}