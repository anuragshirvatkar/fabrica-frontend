import { Check } from 'lucide-react'

const steps = [
  { id: 1, label: 'Basic Information' },
  { id: 2, label: 'Product Details' },
  { id: 3, label: 'Review & Publish' },
] as const

export function ProductStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 md:gap-3">
      {steps.map((step, index) => {
        const done = currentStep > step.id
        const active = currentStep === step.id

        return (
          <div key={step.id} className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                  done
                    ? 'bg-black text-white border-black'
                    : active
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-500 border-gray-300'
                }`}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : step.id}
              </span>
              <span
                className={`hidden sm:inline text-sm ${
                  active || done ? 'text-black font-medium' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className="w-8 md:w-12 border-t border-dashed border-gray-300" />
            )}
          </div>
        )
      })}
    </div>
  )
}
