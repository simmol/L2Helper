import './App.css'

import { Button, Container, Stack, TextInput, Title } from '@mantine/core';


function App() {
  return (
    <Container size="xs" py="xl">
      <Stack>
        <Title order={2}>Mantine is working</Title>
        <TextInput label="Email" placeholder="you@example.com"/>
        <Button>Submit</Button>
      </Stack>
    </Container>
  )
}

export default App
