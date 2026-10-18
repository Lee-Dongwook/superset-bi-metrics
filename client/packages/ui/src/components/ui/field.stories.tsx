import type { Meta, StoryObj } from "@storybook/react-vite"
import { Checkbox } from "@bi-metrics/ui/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@bi-metrics/ui/components/ui/field"
import { Input } from "@bi-metrics/ui/components/ui/input"

const meta = {
  title: "UI/Field",
  component: Field,
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["vertical", "horizontal", "responsive"],
    },
  },
  render: (args) => (
    <FieldSet className="w-96">
      <FieldLegend>Chart settings</FieldLegend>
      <FieldGroup>
        <Field {...args}>
          <FieldLabel htmlFor="chart-name">Name</FieldLabel>
          <Input id="chart-name" placeholder="Monthly revenue" />
          <FieldDescription>Shown on dashboards.</FieldDescription>
        </Field>
        <FieldSeparator />
        <Field orientation="horizontal">
          <Checkbox id="show-total" />
          <FieldContent>
            <FieldLabel htmlFor="show-total">Show total</FieldLabel>
            <FieldDescription>Render the total in the donut hole.</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Invalid: Story = {
  render: () => (
    <Field data-invalid className="w-96">
      <FieldLabel htmlFor="row-limit">Row limit</FieldLabel>
      <Input id="row-limit" aria-invalid defaultValue="-1" />
      <FieldError errors={[{ message: "Row limit must be positive." }]} />
    </Field>
  ),
}
