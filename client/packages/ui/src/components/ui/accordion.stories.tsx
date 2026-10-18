import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@bi-metrics/ui/components/ui/accordion"

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  args: { type: "single" },
  render: (args) => (
    <Accordion {...args} className="w-80">
      <AccordionItem value="datasets">
        <AccordionTrigger>Datasets</AccordionTrigger>
        <AccordionContent>Physical and virtual tables.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="charts">
        <AccordionTrigger>Charts</AccordionTrigger>
        <AccordionContent>ECharts based visualizations.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="dashboards">
        <AccordionTrigger>Dashboards</AccordionTrigger>
        <AccordionContent>Charts arranged on a grid.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = { args: { type: "single", collapsible: true } }

export const Multiple: Story = { args: { type: "multiple" } }
