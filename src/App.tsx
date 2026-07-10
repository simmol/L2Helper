import './App.css'
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { NpcTable } from "./features/NpcTable"


function App() {
  return (
    <MantineProvider>
      <Notifications position={'top-center'}/>
      <NpcTable/>
    </MantineProvider>
  )
}

export default App
