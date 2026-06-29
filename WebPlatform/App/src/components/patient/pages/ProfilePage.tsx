import React, { useState, useEffect } from "react";
import api from "../../../lib/api";
import Icon from "../sub-components/Icon";
import "../../../styles/patientDashboard.css";

const ProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null,
  );
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  const [originalPersonalInfo, setOriginalPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    bloodType: "",
    profilePicture: "",
  });
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    bloodType: "",
    profilePicture: "",
  });
  const [medicalInfo, setMedicalInfo] = useState({
    allergies: "",
    chronicDiseases: "",
    medications: "",
  });
  const [originalMedicalInfo, setOriginalMedicalInfo] = useState({
    allergies: "",
    chronicDiseases: "",
    medications: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/patient/profile");
        const data = res.data;

        console.log("Patient-Data ===> ", data);

        const personal = {
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          age: data.age || "",
          bloodType: data.bloodType || "",
          profilePicture: data.profilePicture || null,
        };

        const medical = {
          allergies: data.allergies || "N/A",
          chronicDiseases: data.chronicDiseases || "N/A",
          medications: data.medications || "N/A",
        };
        setPersonalInfo(personal);
        setOriginalPersonalInfo(personal);

        setMedicalInfo(medical);
        setOriginalMedicalInfo(medical);

        setProfilePicPreview(data.profilePicture || null);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicPreview(URL.createObjectURL(file));
      setProfilePicFile(file);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setPersonalInfo(originalPersonalInfo);
    setMedicalInfo(originalMedicalInfo);
    setProfilePicPreview(originalPersonalInfo.profilePicture || null);
    setProfilePicFile(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();

      formData.append("fullName", personalInfo.fullName);
      formData.append("phone", personalInfo.phone);
      formData.append("age", personalInfo.age || "");
      formData.append("bloodType", personalInfo.bloodType || "");
      formData.append("address", personalInfo.address || "");

      if (profilePicFile) {
        formData.append("profilePicture", profilePicFile);
      }

      await api.put("/patient/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Profile information saved!");
      setIsEditing(false);

      setOriginalPersonalInfo(personalInfo);
      setOriginalMedicalInfo(medicalInfo);
      setProfilePicFile(null);

    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal and medical information.</p>
      </div>

      <div className="card profile-section">
        <h3>Personal Information</h3>
        <div className="form-grid">
          
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            {profilePicPreview ? (
              <img
                src={profilePicPreview}
                alt="Profile"
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid var(--primary-color)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "lightblue",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "40px",
                  margin: "0 auto",
                  border: "3px solid var(--primary-color)",
                }}
              >
                {personalInfo.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
            )}

            {isEditing && (
              <div style={{ marginTop: "1rem" }}>
                <input
                  type="file"
                  id="profile-pic-upload"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="profile-pic-upload"
                  className="btn btn-secondary"
                  style={{ cursor: "pointer" }}
                >
                  Change Photo
                </label>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={personalInfo.fullName}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, fullName: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={personalInfo.email}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, email: e.target.value })
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={personalInfo.address}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, fullName: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={personalInfo.phone}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, phone: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Blood Type</label>
            <input
              type="text"
              value={personalInfo.bloodType}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, bloodType: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Age</label>
            <input
              type="text"
              value={personalInfo.age}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, age: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>

        </div>
      </div>

      <div className="card profile-section">
        <h3>Medical Information</h3>
        <div className="form-grid">
          
          <div className="form-group">
            <label>Allergies</label>
            <input
              type="text"
              value={medicalInfo.allergies}
              onChange={(e) =>
                setMedicalInfo({ ...medicalInfo, allergies: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Chronic Diseases</label>
            <input
              type="text"
              value={medicalInfo.chronicDiseases}
              onChange={(e) =>
                setMedicalInfo({
                  ...medicalInfo,
                  chronicDiseases: e.target.value,
                })
              }
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      <div className="card profile-section">
        <h3>Security</h3>
        <p style={{ marginBottom: "1rem" }}>
          To change your password, please{" "}
          <a href="#" style={{ color: "var(--primary-color)" }}>
            click here
          </a>
          .
        </p>
        <p
          style={{
            display: "flex",
            alignItems: "center",
            color: "var(--muted-text)",
          }}
        >
          <Icon name="alert-circle" className="icon-warning-inline" />
          Ensure your password is strong and not reused.
        </p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        {isEditing ? (
          <>
            <button
              onClick={handleCancelClick}
              className="btn btn-secondary"
              style={{ marginRight: "1rem" }}
            >
              Cancle
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleEditClick}
            disabled={loading}
          >
            Edit Profile
          </button>
        )}
      </div>
      {error && (
        <p className="error-message" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}
    </>
  );
};

export default ProfilePage;