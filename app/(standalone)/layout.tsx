export default function StandaloneLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {children}
        </div>
    )
}
