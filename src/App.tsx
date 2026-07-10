import './App.css'

import { Container } from '@mantine/core';
import { NpcTable } from "./features/NpcTable"


function App() {
  return (
    <Container size="xs" py="xl">
      <NpcTable/>
    </Container>
  )
}

export default App
