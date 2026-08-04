/**
 * useDeleteAccount — the danger-zone flow: modal visibility, password
 * confirmation, and the redirect home once the account and session are gone.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export function useDeleteAccount() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { deleteAccount } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  // Reset the field and any previous error each time the modal is opened
  const openDeleteModal = () => {
    setDeletePassword("");
    setDeleteMessage("");
    setIsDeleteModalOpen(true);
  };

  // Permanently delete the account after password confirmation, then redirect home
  const handleDeleteAccount = async () => {
    setDeleteMessage("");
    setIsDeleting(true);
    const { error } = await deleteAccount(deletePassword);
    setIsDeleting(false);

    if (error) {
      // INVALID_PASSWORD is returned by the edge function for a wrong password
      setDeleteMessage(
        error === "INVALID_PASSWORD"
          ? t.myProfile.settings.deleteWrongPassword
          : t.myProfile.settings.deleteError
      );
      return;
    }

    // Success — account and session are gone; send the user to the landing page
    navigate("/");
  };

  return {
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal: () => setIsDeleteModalOpen(false),
    deletePassword,
    setDeletePassword,
    isDeleting,
    deleteMessage,
    handleDeleteAccount,
  };
}
