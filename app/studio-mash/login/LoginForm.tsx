"use client";

import { useActionState, useEffect, useState } from "react";
import { requestAdminCode, verifyAdminCode, type ActionState } from "../actions";

const initialState: ActionState = {};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(requestAdminCode, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyAdminCode, initialState);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (requestState.ok) setCodeSent(true);
  }, [requestState.ok]);

  return (
    <div className="admin-login__panel">
      <div className="admin-brand">
        <span>MASH</span>
        <small>Martinez Star Home</small>
      </div>
      <h1>Acceso administrador</h1>
      <p>Ingresa con un codigo temporal enviado a un correo autorizado.</p>

      <form action={requestAction} className="admin-form">
        <label>
          Correo
          <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {requestState.errors?.email && <p className="admin-error">{requestState.errors.email}</p>}
        {requestState.message && <p className={requestState.ok ? "admin-success" : "admin-error"}>{requestState.message}</p>}
        <button className="admin-button" type="submit" disabled={requestPending}>
          {requestPending ? "Enviando..." : "Enviar codigo"}
        </button>
      </form>

      {codeSent && (
        <form action={verifyAction} className="admin-form admin-form--code">
          <input type="hidden" name="email" value={email} />
          <label>
            Codigo de 6 digitos
            <input name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
          </label>
          {verifyState.errors?.token && <p className="admin-error">{verifyState.errors.token}</p>}
          {verifyState.message && <p className="admin-error">{verifyState.message}</p>}
          <button className="admin-button" type="submit" disabled={verifyPending}>
            {verifyPending ? "Verificando..." : "Verificar codigo"}
          </button>
        </form>
      )}
    </div>
  );
}
