import { useState, type ReactNode } from "react";
import { Input, Modal } from "antd";
import { t } from "../../translation";

export interface DeleteModalProps {
  title: ReactNode;
  description: ReactNode;
  open: boolean;
  onConfirm: () => void;
  onHide: () => void;
}

/** Confirmation modal that requires typing DELETE, like upstream. */
export function DeleteModal({
  title,
  description,
  open,
  onConfirm,
  onHide,
}: DeleteModalProps) {
  const [value, setValue] = useState("");
  const confirmText = t("DELETE");
  const hide = () => {
    setValue("");
    onHide();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={hide}
      onOk={() => {
        setValue("");
        onConfirm();
      }}
      okText={t("Delete")}
      okButtonProps={{ danger: true, disabled: value.toUpperCase() !== confirmText }}
      destroyOnHidden
    >
      <div>{description}</div>
      <p style={{ marginTop: 16 }}>
        {t("Type \"%s\" to confirm", confirmText)}
      </p>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={() => {
          if (value.toUpperCase() === confirmText) {
            setValue("");
            onConfirm();
          }
        }}
        data-test="delete-modal-input"
      />
    </Modal>
  );
}
