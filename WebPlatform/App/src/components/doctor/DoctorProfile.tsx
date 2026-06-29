import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import "../../styles/doctorProfile.css";

const DoctorProfile = () => {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<
    "personal" | "professional" | "certifications" | "account" | "security">("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null,
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage ,setSuccessMessage] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    profilePicture: null as string | null,
  });

  const [professionalInfo, setProfessionalInfo] = useState({
    specialization: "",
    yearsOfExperience: "",
    clinicName: "",
    licenseNumber: "",
    biography: "",
  });

  const [certificates, setCertificates] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [accountStatus, setAccountStatus] = useState({
    status: "pending",
    approvedDate: null as string | null,
    approvedBy: null as string | null,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/doctor/profile");
        const data = res.data;
        console.log("Retreived data: ", data);

        setPersonalInfo({
          fullName: data.full_name || "",
          email: data.email.email|| "",
          phone: data.phone_number || "",
          gender: data.gender || "",
          dateOfBirth: data.date_of_birth || "",
          profilePicture: data.profile_picture || null,
        });

        setProfessionalInfo({
          specialization: data.specialty|| "",
          yearsOfExperience: data.years_of_experience || "",
          clinicName: data.clinic_name|| "",
          licenseNumber: data.license_file_path|| "",
          biography: data.biography || "",
        });

        setCertificates(data.certificates || []);

        // Set account status
        setAccountStatus({
          status: data.is_approved ? "approved" : "pending",
          approvedDate: data.admin_approval_date || null,
          approvedBy: data.approved_by || null,
        });
      } catch (err: any) {
        console.error("Profile fetch error:", err);
        if (err.response?.status === 401) {
          console.error("Unauthorized - token may be invalid");
        }
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailability = async () => {
      try {
        const res = await api.get("/doctor/availability");
        setAvailability(res.data || []);
      } catch (err: any) {
        console.error("Failed to fetch availability:", err);
        if (err.response?.status === 401) {
          console.error("Unauthorized - availability fetch failed");
        }
        // Don't set error for availability fetch, just log it
      }
    };

    fetchProfile();
    fetchAvailability();
  }, []);

  const handlePersonalInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfessionalInfoChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setProfessionalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("fullName", personalInfo.fullName);
      formData.append("phone", personalInfo.phone);
      formData.append("gender", personalInfo.gender);
      formData.append("dateOfBirth", personalInfo.dateOfBirth);
      formData.append("specialization", professionalInfo.specialization);
      formData.append("yearsOfExperience", professionalInfo.yearsOfExperience);
      formData.append("clinicName", professionalInfo.clinicName);
      formData.append("biography", professionalInfo.biography);

      const fileInput = document.getElementById("profile-pic-upload") as HTMLInputElement;

      if (fileInput && fileInput.files && fileInput.files[0]) { 
        formData.append('profilePicture', fileInput.files[0]);
      }

      const response = await api.put("/doctor/profile", formData, {
        headers: {'Content-Type': 'multipart/form-data'}
      });
      
      if (response.status === 200 || response.status === 204) {
        alert("Profile updated successfully!");
        setIsEditing(false);
      } else {
        throw new Error("Unexepected response");
      }

    } catch (err: any) {
      console.error("Save error :==> ", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to save profile";
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setIsEditing(false);
  };

  const handleChangePassword = async() => {
    setPasswordErrors({newPassword: '', confirmPassword: ''});
    let hasError = false;

    if (!newPassword){
      setPasswordErrors(prev => ({...prev, newPassword: 'New password is required'}));
      hasError = true;
    } else if (newPassword.length < 8 ){
      setPasswordErrors(prev => ({...prev, newPassword: 'Password must be at least 8 characters'}));
      hasError = true;
    }

    if (!confirmPassword){
      setPasswordErrors(prev => ({...prev, confirmPassword: 'Please confirm new password'}));
      hasError = true;
    } else if (newPassword !== confirmPassword){
      setPasswordErrors(prev => ({...prev, confirmPassword: 'Passwords do not match'}));
      hasError = true;
    }

    if (hasError) return;

    try{
      setLoading(true);
      await api.post('/doctor/change-password', {
        newPassword,
        confirmPassword,
      });

      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({newPassword: '', confirmPassword: ''});
      setSuccessMessage('Password changed successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to change password';
      setPasswordErrors(prev => ({...prev, confirmPassword: errorMsg}));
    } finally{
      setLoading(false);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadCertificate = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("certificate", file);

      formData.append(
        "name",
        "New Certificate " + new Date().toLocaleDateString(),
      );
      formData.append("issueDate", new Date().toISOString().split("T")[0]);

      try {
        const res = await api.post("/doctor/certificates", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setCertificates((prev) => [...prev, res.data]);
        alert("Certificate uploaded successfully!");
      } catch (err: any) {
        console.error("Upload error:", err);
        alert(
          "Failed to upload certificate: " +
            (err.response?.data?.error || err.message),
        );
      }
    }
  };

  const handleDeleteCertificate = async (id: number) => {
    try {
      await api.delete(`/doctor/certificates/${id}`);
      setCertificates((prev) => prev.filter((cert) => cert.id !== id));
    } catch (err) {
      alert("Failed to delete certificate");
    }
  };

  const handleViewCertificate = (filePath: string) => {
    if (!filePath) {
      alert("No file available");
      return;
    }

    // Open file in new tab - filePath is already a full Supabase URL
    window.open(filePath, "_blank");
  };

  const handleDownloadCertificate = async (filePath: string) => {
    if (!filePath) {
      alert("No file available");
      return;
    }

    try {
      // Fetch the file from Supabase URL
      const response = await fetch(filePath);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      
      // Extract filename from URL or use default
      const filename = filePath.split("/").pop() || "certificate.pdf";

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log("Download triggered successfully");
    } catch (err: any) {
      console.error("Download failed:", err);
      const errorMsg = err.message || "Download failed";
      alert(errorMsg);
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="doctor-profile">
      <div className="doctor-profile-header">
        <h1>Profile</h1>
        <div className="header-actions">
          {isEditing ? (
            <>
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              className="edit-button"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-picture">
            {profilePicPreview || personalInfo.profilePicture ? (
              <img
                src={profilePicPreview || personalInfo.profilePicture || ''}
                alt="Profile"
                className="avatar-img"
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  objectFit: "fill",
                }}
              />
            ) : (
              <div className="avatar">
                {personalInfo.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
            )}

            {isEditing && (
              <div>
                <input
                  type="file"
                  id="profile-pic-upload"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="profile-pic-upload" className="upload-button">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  Upload Photo
                </label>
              </div>
            )}
          </div>

          <nav className="profile-nav">
            <button
              className={`nav-item ${activeSection === "personal" ? "active" : ""}`}
              onClick={() => setActiveSection("personal")}
            >
              Personal Information
            </button>
            <button
              className={`nav-item ${activeSection === "professional" ? "active" : ""}`}
              onClick={() => setActiveSection("professional")}
            >
              Professional Information
            </button>
            <button
              className={`nav-item ${activeSection === "certifications" ? "active" : ""}`}
              onClick={() => setActiveSection("certifications")}
            >
              Certifications & Documents
            </button>
            <button
              className={`nav-item ${activeSection === "account" ? "active" : ""}`}
              onClick={() => setActiveSection("account")}
            >
              Account Status
            </button>
            <button
              className={`nav-item ${activeSection === "security" ? "active" : ""}`}
              onClick={() => setActiveSection("security")}
            >
              Security Settings
            </button>
          </nav>
        </div>

        <div className="profile-content">
          {activeSection === "personal" && (
            <div className="profile-section">
              <h2>Personal Information</h2>
              <div className="info-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={personalInfo.fullName}
                    onChange={handlePersonalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={personalInfo.phone || ""}
                    onChange={handlePersonalInfoChange}
                    disabled={!isEditing}
                    maxLength={11}
                    minLength={11}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={personalInfo.gender || ""}
                    onChange={handlePersonalInfoChange}
                    disabled={!isEditing}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={personalInfo.dateOfBirth || ""}
                    onChange={handlePersonalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "professional" && (
            <div className="profile-section">
              <h2>Professional Information</h2>
              <div className="info-grid">
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={professionalInfo.specialization || ""}
                    onChange={handleProfessionalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="text"
                    name="yearsOfExperience"
                    value={professionalInfo.yearsOfExperience || ""}
                    onChange={handleProfessionalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Clinic / Hospital Name</label>
                  <input
                    type="text"
                    name="clinicName"
                    value={professionalInfo.clinicName || ""}
                    onChange={handleProfessionalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Medical License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={professionalInfo.licenseNumber || ""}
                    onChange={handleProfessionalInfoChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Biography</label>
                  <textarea
                    name="biography"
                    value={professionalInfo.biography}
                    onChange={handleProfessionalInfoChange}
                    disabled={!isEditing}
                    rows={5}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Availability Schedule</label>
                  <div className="availability-schedule">
                    {availability && availability.length > 0 ? (
                      <div className="availability-list">
                        {availability.map((slot) => (
                          <div key={slot.id} className="availability-item">
                            <span className="day-name">{getDayName(slot.day_of_week)}</span>
                            <span className="time-range">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                            <span className={`availability-status ${slot.is_available ? 'available' : 'unavailable'}`}>
                              {slot.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-availability">No availability schedule set</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "certifications" && (
            <div className="profile-section">
              <h2>Certifications & Documents</h2>
              <div className="certifications-list">
                {certificates.map((cert) => (
                  <div key={cert.id} className="certification-item">
                    <div className="cert-info">
                      <h3>{cert.name}</h3>
                      <p>
                        Issue Date:{" "}
                        {cert.issueDate
                          ? new Date(cert.issueDate).toLocaleDateString()
                          : "Not specified"}
                      </p>
                    </div>

                    <div className="cert-actions">
                      <button
                        className="view-button"
                        onClick={() => handleViewCertificate(cert.file)}
                      >
                        {" "}
                        View
                      </button>
                      <button
                        className="download-button"
                        onClick={() => handleDownloadCertificate(cert.file)}
                      >
                        Download
                      </button>
                      {isEditing && (
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteCertificate(cert.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="upload-section">
                  <h3>Upload New Certificate</h3>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="certificate-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleUploadCertificate}
                      style={{ display: "none" }}
                    />
                    <label
                      htmlFor="certificate-upload"
                      className="upload-label"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Choose File
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "account" && (
            <div className="profile-section">
              <h2>Account Status</h2>
              <div className="status-card">
                <div className={`status-indicator ${accountStatus.status === "approved" ? "approved" : "pending"}`}></div>
                <div className="status-info">
                  <h3>Account Status: {accountStatus.status === "approved" ? "Approved" : "Pending"}</h3>
                  <p>
                    {accountStatus.status === "approved" 
                      ? "Your account has been approved by the admin. You have full access to all features."
                      : "Your account is pending approval. Please wait for the admin to review your registration."}
                  </p>
                  {accountStatus.approvedDate && (
                    <p className="approval-date">
                      Approved on: {new Date(accountStatus.approvedDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="profile-section">
              <h2>Change Password</h2>
                <div className="password-form">
                  <div className="form-group">
                    <label>New Password</label>
                    <input 
                    type={showPassword ? 'test': "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={passwordErrors.newPassword ? 'input-error' : ''}
                    />
                    {passwordErrors.newPassword && (
                      <span className="error-text" style={{color: 'red', fontSize: '0.85rem'}}>
                        {passwordErrors.newPassword}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                    type={showConfirmPassword ? 'text' : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={passwordErrors.confirmPassword ? 'input-error' : ''} 
                    />
                    {passwordErrors.confirmPassword && (
                      <span className="error-text" style={{color: 'red', fontSize: '0.85rem'}}>
                        {passwordErrors.confirmPassword}
                      </span>
                    )}
                  </div>

                  <button
                    className="change-password-button"
                    onClick={handleChangePassword}
                    disabled={loading}
                  >
                    {loading ? 'Changing' : 'Change Password'}
                  </button>
                  {successMessage && (
                    <p className="success-message" style={{color: 'green', marginTop: '10px'}}>
                      {successMessage}
                    </p>
                  )}
                </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
