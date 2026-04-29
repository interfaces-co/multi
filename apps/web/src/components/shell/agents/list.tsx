import { SolidIsland } from "~/solid/react-solid-island";
import { SolidAgentList, type SolidAgentListProps } from "./list.solid";

export type AgentListProps = SolidAgentListProps;

export function AgentList(props: AgentListProps) {
  return (
    <SolidIsland
      className="flex min-h-0 flex-1 flex-col"
      component={SolidAgentList}
      props={props}
    />
  );
}
