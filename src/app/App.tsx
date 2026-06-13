import { AppProviders } from "@/app/providers/AppProviders";
import { DataRoomRouter } from "@/app/router/DataRoomRouter";

export function App() {
  return (
    <AppProviders>
      <DataRoomRouter />
    </AppProviders>
  );
}
