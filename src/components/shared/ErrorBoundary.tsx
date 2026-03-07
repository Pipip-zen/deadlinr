import React from 'react'

interface Props {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info)
    }

    handleReset = () => this.setState({ hasError: false, error: null })

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                    <div className="text-5xl">💥</div>
                    <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                        Try again
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
