// Marca visual da Sesconetto's (chama), usada como logo em telas-chave do app.
// Baseada no elemento de marca definido no Manual de Identidade Visual.

export default function FlameMark({ size = 56 }) {
  return (
    <div
      className="flame-mark"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          fill="#fff"
          d="M15.98 13.98a4 4 0 0 1-8.14-4.3c1.2 1.2 1.99 1.99 1.99 1.99 0-2.4.6-4.8 3.58-8.4-.48 2.4.6 3.6 2.4 5.4a9.57 9.57 0 0 1 2.19 3.28 4 4 0 0 1-1.02 2.03Z"
        />
        <path
          fill="var(--primary)"
          d="M11.86 16.15a1.8 1.8 0 0 0 1.28-3.06l-.61 1.8h-1.2a1.8 1.8 0 0 0 .53 1.26Z"
        />
      </svg>
    </div>
  );
}
