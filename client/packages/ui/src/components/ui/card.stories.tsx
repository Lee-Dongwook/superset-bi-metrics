import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@bi-metrics/ui/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@bi-metrics/ui/components/ui/card"

const meta = {
  title: "UI/Card",
  component: Card,
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader>
        <CardTitle>Monthly revenue</CardTitle>
        <CardDescription>Updated 5 minutes ago</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">$18,000</CardContent>
      <CardFooter className="text-sm text-muted-foreground">+12% vs last month</CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
